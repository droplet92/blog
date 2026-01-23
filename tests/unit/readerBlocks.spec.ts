import { describe, expect, it } from 'vitest';
import { buildReaderBlocks } from '../../src/lib/readerBlocks';

describe('buildReaderBlocks', () => {
  it('keeps normal paragraphs', () => {
    const blocks = buildReaderBlocks('Hello world\n\nSecond para');
    expect(blocks).toEqual([
      { type: 'p', text: 'Hello world' },
      { type: 'p', text: 'Second para' }
    ]);
  });

  it('converts a standalone YouTube link to an embed block', () => {
    const blocks = buildReaderBlocks('https://youtu.be/dQw4w9WgXcQ');
    expect(blocks).toEqual([{ type: 'youtube', id: 'dQw4w9WgXcQ' }]);
  });

  it('extracts YouTube links from within text and appends embed blocks', () => {
    const blocks = buildReaderBlocks('Watch this https://www.youtube.com/watch?v=dQw4w9WgXcQ thanks');
    expect(blocks).toEqual([
      { type: 'p', text: 'Watch this thanks' },
      { type: 'youtube', id: 'dQw4w9WgXcQ' }
    ]);
  });

  it('supports shorts and embed URLs', () => {
    const blocks = buildReaderBlocks(
      [
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        '',
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      ].join('\n')
    );

    expect(blocks).toEqual([
      { type: 'youtube', id: 'dQw4w9WgXcQ' },
      { type: 'youtube', id: 'dQw4w9WgXcQ' }
    ]);
  });

  it('converts Spotify track/album/playlist links to embed blocks', () => {
    const blocks = buildReaderBlocks(
      [
        'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b?si=abc',
        'https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj',
        'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
      ].join('\n\n')
    );

    expect(blocks).toEqual([
      { type: 'spotify', kind: 'track', id: '0VjIjW4GlUZAMYd2vXMi3b' },
      { type: 'spotify', kind: 'album', id: '4yP0hdKOZPNshxUOjY0cZj' },
      { type: 'spotify', kind: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M' }
    ]);
  });

  it('extracts Spotify links from within text and appends embed blocks', () => {
    const blocks = buildReaderBlocks(
      'Now playing https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b and moving on'
    );

    expect(blocks).toEqual([
      { type: 'p', text: 'Now playing and moving on' },
      { type: 'spotify', kind: 'track', id: '0VjIjW4GlUZAMYd2vXMi3b' }
    ]);
  });
});
