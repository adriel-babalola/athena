export default function handler(req, res) {
  res.status(200).json({ status: 'ok', message: 'Athena server is running' });
}
