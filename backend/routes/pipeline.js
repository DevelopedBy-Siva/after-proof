const router = require('express').Router();
const axios = require('axios');

router.post('/start', async (req, res) => {
  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required' });
    }

    await axios.post(`${process.env.AGENT_SERVICE_URL}/run-pipeline`, { submissionId });
    res.json({ started: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
