const axios = require('axios');

module.exports = async (req, res) => {
  // អនុញ្ញាត CORS សម្រាប់ការហៅពី frontend
  res.setHeader('Access-Control-Allow-Origin', '*');

  // យក username ពី query parameter (ឧ. /api/github?username=octocat)
  const { username = 'octocat' } = req.query;

  try {
    const response = await axios.get(`https://api.github.com/users/${username}`);
    const userData = response.data;

    res.status(200).json({
      success: true,
      data: {
        login: userData.login,
        name: userData.name,
        bio: userData.bio,
        public_repos: userData.public_repos,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
      },
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: `User "${username}" not found`,
    });
  }
};
