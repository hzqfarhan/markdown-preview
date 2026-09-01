import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Markdown Previewer',
    short_name: 'MDPreview',
    description: 'Write, preview, and export markdown — offline capable.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8F6',
    theme_color: '#E91E8C',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
