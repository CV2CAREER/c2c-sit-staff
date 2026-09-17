import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // The Placement Controller dashboard used to live under /assistant,
      // a name predating the PC-triple rebrand. Anything that still
      // references the old path (bookmarks, cached emails, old comment
      // links) transparently lands on the new /pc URL instead of 404ing.
      // Remove once we're confident nothing external still points here.
      {
        source: '/assistant/:path*',
        destination: '/pc/:path*',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
