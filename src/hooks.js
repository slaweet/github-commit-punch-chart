import { to } from 'await-to-js';
import { useQueryParam, StringParam, BooleanParam } from 'use-query-params';
import { useState, useEffect } from 'react';
import moment from 'moment';

import { getComments, getCommits, getPullRequests } from './utils';

const formatEndOfDay = (date) => (
  date.endOf('day').toISOString().substr(0, 10)
);

export function useQueryParamConfig() {
  const [repo = ''] = useQueryParam('repo', StringParam);
  const [username = ''] = useQueryParam('username', StringParam);
  const [since = formatEndOfDay(moment().subtract(14, 'days'))] = useQueryParam('since', StringParam);
  const [until = formatEndOfDay(moment())] = useQueryParam('until', StringParam);
  const [showAvatarsAsPoints = false] = useQueryParam('showAvatarsAsPoints', BooleanParam);

  return [{
    username, repo, since, until, showAvatarsAsPoints,
  }];
}

function useEvents({
  username, repo, since, until,
}, getEvents) {
  const [commits, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function validateConfig() {
      const isValid = !!repo && !!username;
      if (!isValid) {
        setError('Missing `repo` and/or `username` param. Please select them in the header dropdown');
      }
      return isValid;
    }

    async function fetchUrl(page = 1, prevEvents = []) {
      setLoading(true);
      const [err, response] = await to(getEvents({
        repo, username, page, since, until,
      }));
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        const currentEvents = [
          ...prevEvents,
          ...response.data.filter(
            ({ id }) => !prevEvents.some((c) => c.id === id),
          )];
        setEvents(currentEvents);
        if (response.data.length === 30) {
          fetchUrl(page + 1, currentEvents);
        }
      }
    }
    if (validateConfig()) {
      fetchUrl();
    }
  }, [username, repo, since, until, getEvents]);
  return [commits, loading, error];
}

export function useCommits(config) {
  return useEvents(config, getCommits);
}

export function usePullRequests(config) {
  return useEvents(config, getPullRequests);
}

export function useComments({
  username, repo, since, until,
}, pulls) {
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUrl(page = 0, prevEvents = []) {
      setLoading(true);
      const [err, response] = await to(getComments({
        repo, username, since, until, pr: pulls[page],
      }));
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        const currentComments = [...prevEvents, ...response.data];
        setComments(currentComments);
        if (pulls[page + 1]) {
          fetchUrl(page + 1, currentComments);
        }
      }
    }
    if (pulls.length > 0) {
      fetchUrl();
    }
  }, [username, repo, since, until, pulls]);
  return [comments, loading, error];
}
