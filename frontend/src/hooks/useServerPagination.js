import { useEffect, useRef, useState } from 'react';
import api from '../services/api.jsx';

const initialResult = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  summary: null,
  metadata: null,
  requestKey: '',
  error: '',
};

export default function useServerPagination(path, filters, page, pageSize) {
  const [result, setResult] = useState(initialResult);
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);
  const filterQuery = new URLSearchParams(filters).toString();
  const requestKey = `${path}?${filterQuery}&page=${page}&pageSize=${pageSize}&reload=${reloadKey}`;

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const params = new URLSearchParams(filterQuery);
    params.set('page', page);
    params.set('pageSize', pageSize);

    api.get(`${path}?${params.toString()}`)
      .then(({ data }) => {
        if (
          !Array.isArray(data?.items)
          || !Number.isSafeInteger(data.page)
          || data.page < 1
          || !Number.isSafeInteger(data.pageSize)
          || data.pageSize < 1
          || !Number.isSafeInteger(data.total)
          || data.total < 0
        ) {
          throw new Error('Resposta de paginação inválida');
        }
        if (requestId.current === currentRequest) {
          setResult({
            items: data.items,
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
            summary: data.summary || null,
            metadata: data.metadata || null,
            requestKey,
            error: '',
          });
        }
      })
      .catch((requestError) => {
        if (requestId.current === currentRequest) {
          setResult({
            items: [],
            page,
            pageSize,
            total: 0,
            summary: null,
            metadata: null,
            requestKey,
            error: requestError.response?.data?.msg || requestError.message || 'Não foi possível carregar a lista',
          });
        }
      });

    return () => {
      if (requestId.current === currentRequest) requestId.current += 1;
    };
  }, [filterQuery, page, pageSize, path, reloadKey, requestKey]);

  const isCurrentResult = result.requestKey === requestKey;
  return {
    ...result,
    items: isCurrentResult ? result.items : [],
    page: isCurrentResult ? result.page : page,
    pageSize,
    total: isCurrentResult ? result.total : 0,
    summary: isCurrentResult ? result.summary : null,
    metadata: isCurrentResult ? result.metadata : null,
    loading: !isCurrentResult,
    error: isCurrentResult ? result.error : '',
    reload: () => setReloadKey((current) => current + 1),
  };
}
