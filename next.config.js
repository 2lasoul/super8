/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // /videos/fichier.mp4 → proxié vers le container nginx interne
        source: '/videos/:file*',
        destination: 'http://videos:80/videos/:file*',
      },
    ]
  },
}
module.exports = nextConfig
