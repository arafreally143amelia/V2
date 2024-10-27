const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = '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';
const REPO_OWNER = 'arafreally143amelia';
const REPO_NAME = 'teaches';
const FILE_PATH = 'teaches.json';

let teachingData = [];
const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function loadTeachingData() {
  try {
    const response = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: FILE_PATH });
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    teachingData = JSON.parse(content).teaches;
  } catch (error) {
    console.error('Failed to load teaching data:', error.message);
  }
}

app.get('/teach', async (req, res) => {
  const ask = req.query.ask;
  const ans = req.query.ans;

  if (ask && ans) {
    teachingData.push({ ask, ans });
    await saveTeachingDataToGitHub();
    return res.send('Teaching data updated successfully!');
  }

  const matchingEntry = teachingData.find(entry => entry.ask.toLowerCase() === ask.toLowerCase());
  res.send(matchingEntry ? matchingEntry.ans : "I don't have an answer for that. 😕");
});

app.get('/chat', async (req, res) => {
  const ask = req.query.ask;
  const apiUrl = `https://www.x-noobs-api.000.pe/sim?ask=${encodeURIComponent(ask)}`;
  
  try {
    const response = await axios.get(apiUrl);
    res.send(response.data);
  } catch {
    res.status(500).send('Error chatting with the AI Robot.');
  }
});

app.get('/monitor', (req, res) => {
  res.json(teachingData);
});

async function saveTeachingDataToGitHub() {
  const jsonData = JSON.stringify({ teaches: teachingData }, null, 2);
  const content = Buffer.from(jsonData).toString('base64');

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: 'Update teaching data',
      content,
      sha: await getFileSha(),
    });
  } catch (error) {
    console.error('Failed to save teaching data to GitHub:', error.message);
  }
}

async function getFileSha() {
  try {
    const response = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: FILE_PATH });
    return response.data.sha;
  } catch (error) {
    console.error('Failed to get file SHA:', error.message);
    return null;
  }
}

loadTeachingData();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
