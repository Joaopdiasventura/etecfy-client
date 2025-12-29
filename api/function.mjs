import { reqHandler } from '../dist/etecfy/server/server.mjs';

export default function (req, res) {
  return reqHandler(req, res);
}
