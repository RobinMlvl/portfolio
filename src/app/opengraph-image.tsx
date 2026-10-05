import { ImageResponse } from 'next/og';
import { site } from '@/content/site';

export const alt = 'Robin Malaval, full-stack engineer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: 'radial-gradient(120% 80% at 50% 105%, #17191D 0%, #0E0F11 62%)', color: '#ECEDEE', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 26, color: '#A3A7AE' }}><span style={{ width: 14, height: 14, borderRadius: 7, background: '#FF4F3A', marginRight: 14 }} />{site.hero.kicker}</div>
        <div style={{ display: 'flex', fontSize: 150, fontWeight: 800, letterSpacing: -8, lineHeight: 0.9, marginTop: 30 }}>{site.hero.name[0]} {site.hero.name[1]}.</div>
        <div style={{ fontSize: 28, color: '#A3A7AE', marginTop: 40, maxWidth: 900 }}>{site.hero.sub.lead}</div>
      </div>
    ),
    size,
  );
}
