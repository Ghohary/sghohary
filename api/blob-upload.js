import cloudUpload from './upload';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  return cloudUpload(req, res);
}
