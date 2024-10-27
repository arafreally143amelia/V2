const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Octokit } = require("@octokit/rest");

const app = express();
const port = 4000;

app.use(cors());

const GITHUB_REPO_OWNER = 'arafreally143amelia';
const GITHUB_REPO_NAME = 'teaches';
const GITHUB_FILE_PATH = 'teaches.json';
const GITHUB_TOKEN = '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';

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const fetchTeachesFromGitHub = async () => {
  try {
    const response = await axios.get(`https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/main/${GITHUB_FILE_PATH}`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching teaches:', error);
    return [];
  }
};

const updateTeachesOnGitHub = async (updatedTeaches) => {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: GITHUB_FILE_PATH,
    });

    const sha = data.sha;

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: GITHUB_FILE_PATH,
      message: 'Update teaches',
      content: Buffer.from(JSON.stringify(updatedTeaches, null, 2)).toString('base64'),
      sha,
    });
  } catch (error) {
    console.error('Error updating teaches on GitHub:', error);
  }
};

app.get('/chat', async (req, res) => {
  try {
    const userQuery = req.query.ask;

    if (!userQuery) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const apiResponse = await axios.get(`https://www.x-noobs-api.000.pe/sim?ask=${encodeURIComponent(userQuery)}`);

    if (apiResponse.data && apiResponse.data.ans) {
      return res.json({ reply: apiResponse.data.ans });
    }

    const teaches = await fetchTeachesFromGitHub();
    const match = teaches.find(t => t.message.toLowerCase() === userQuery.toLowerCase());

    if (match) {
      const randomReply = match.replies[Math.floor(Math.random() * match.replies.length)];
      return res.json({ reply: randomReply });
    }

    return res.json({ reply: 'No response found.' });
  } catch (error) {
    console.error('Error during chat:', error);
    res.status(500).json({ error: 'Error during chat' });
  }
});

app.get('/teach', async (req, res) => {
  try {
    const { ask, ans } = req.query;

    if (!ask || !ans) {
      return res.status(400).json({ error: 'Both ask and ans are required' });
    }

    const currentTeaches = await fetchTeachesFromGitHub();

    if (!Array.isArray(currentTeaches)) {
      return res.status(500).json({ error: 'Current teaches data is not an array' });
    }

    const newTeach = {
      message: ask,
      replies: [ans.trim()],
    };

    currentTeaches.push(newTeach);

    await updateTeachesOnGitHub(currentTeaches);

    res.json({ message: 'Teach added successfully!', teaches: currentTeaches });
  } catch (error) {
    console.error('Error during teach:', error);
    res.status(500).json({ error: 'Error during teach' });
  }
});

app.get('/admin/list', async (req, res) => {
  try {
    const teaches = await fetchTeachesFromGitHub();
    res.json(teaches);
  } catch (error) {
    console.error('Error fetching teach list:', error);
    res.status(500).json({ error: 'Error fetching teach list' });
  }
});

app.get('/admin/edit', async (req, res) => {
  try {
    const { ask, newReply } = req.query;

    if (!ask || !newReply) {
      return res.status(400).json({ error: 'Both ask and newReply are required' });
    }

    const teaches = await fetchTeachesFromGitHub();
    const teachIndex = teaches.findIndex(t => t.message.toLowerCase() === ask.toLowerCase());

    if (teachIndex === -1) {
      return res.status(404).json({ error: 'Teach not found' });
    }

    teaches[teachIndex].replies = [newReply];

    await updateTeachesOnGitHub(teaches);
    res.json({ message: 'Teach updated successfully!', teaches });
  } catch (error) {
    console.error('Error editing teach:', error);
    res.status(500).json({ error: 'Error editing teach' });
  }
});

app.get('/admin/delete', async (req, res) => {
  try {
    const { ask } = req.query;

    if (!ask) {
      return res.status(400).json({ error: 'Ask is required for deletion' });
    }

    const teaches = await fetchTeachesFromGitHub();
    const updatedTeaches = teaches.filter(t => t.message.toLowerCase() !== ask.toLowerCase());

    if (teaches.length === updatedTeaches.length) {
      return res.status(404).json({ error: 'Teach not found' });
    }

    await updateTeachesOnGitHub(updatedTeaches);
    res.json({ message: 'Teach deleted successfully!', teaches: updatedTeaches });
  } catch (error) {
    console.error('Error deleting teach:', error);
    res.status(500).json({ error: 'Error deleting teach' });
  }
});

app.listen(port, () => {
  console.log(`Advanced AI Chat and Teach Server running on http://localhost:${port}`);
});
