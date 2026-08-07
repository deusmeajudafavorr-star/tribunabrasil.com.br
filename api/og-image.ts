export default async function handler(req: any, res: any) {
  const imageUrl = req.query.url || req.query.img;
  
  const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?fm=jpg&fit=crop&w=1200&h=630&q=80';
  
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.redirect(302, DEFAULT_IMAGE);
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return res.redirect(302, DEFAULT_IMAGE);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType.includes('image') ? contentType : 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Error proxying OG image:', error);
    return res.redirect(302, DEFAULT_IMAGE);
  }
}
