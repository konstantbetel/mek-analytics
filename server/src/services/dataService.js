import { buildStubData } from '../data/stubData.js';

let cache = null;

export function getData() {
  if (!cache) cache = buildStubData();
  return cache;
}

export function setData(data) {
  cache = data;
  return cache;
}
