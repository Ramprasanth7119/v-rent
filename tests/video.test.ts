/**
 * The video tour.
 *
 * Two things are worth pinning down here. The refusals, because an agent who
 * picks the wrong file should be told in the same second rather than after a
 * hundred-megabyte upload; and the signature, because it is the only thing
 * standing between a signed upload and a browser that writes wherever it likes.
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_VIDEO_BYTES, VIDEO_TYPES, videoLength, videoProblem, videoPublicId, videoSize,
} from '../lib/phase1/video';
import { signParams, videoUrls } from '../lib/phase1/cloudinary';

const file = (type: string, size: number) => ({ type, size });

describe('what may be uploaded', () => {
  it('takes what a phone records', () => {
    for (const type of Object.keys(VIDEO_TYPES)) {
      expect(videoProblem(file(type, 5 * 1024 * 1024))).toBeNull();
    }
  });

  it('refuses a file that is not a video, by name', () => {
    expect(videoProblem(file('image/jpeg', 1000))).toContain('MP4');
    expect(videoProblem(file('application/pdf', 1000))).toContain('MP4');
  });

  it('refuses an empty file rather than uploading nothing', () => {
    expect(videoProblem(file('video/mp4', 0))).toBe('That file is empty.');
  });

  /* Stated in the refusal so the agent knows how far over they are rather than
     only that they are over — and to a decimal place, because a file barely
     over the limit used to round down to the limit and read as nonsense. */
  it('says how large the file was and what the limit is', () => {
    const problem = videoProblem(file('video/mp4', MAX_VIDEO_BYTES + 1))!;
    expect(problem).toContain(`The limit is ${MAX_VIDEO_BYTES / (1024 * 1024)} MB`);
    expect(problem).toMatch(/That video is 25\.0 MB/);
  });

  /* 25 MB, not Cloudinary's 100: the limit that matters is the tenant's, on a
     phone and often on mobile data. */
  it('takes a minute of phone video and refuses a long recording', () => {
    expect(MAX_VIDEO_BYTES).toBe(25 * 1024 * 1024);
    expect(videoProblem(file('video/mp4', 20 * 1024 * 1024))).toBeNull();
    expect(videoProblem(file('video/mp4', 60 * 1024 * 1024))).not.toBeNull();
  });
});

describe('where the file lands', () => {
  it('puts it under the owner and the listing', () => {
    expect(videoPublicId('acc-1', 'lst-9')).toBe('vrent/listings/acc-1/lst-9/tour');
  });

  /* The id is signed, so anything that could break out of the path has to be
     gone before it is — a listing id with a slash in it would otherwise write
     into another agent's folder. */
  it('strips anything that could climb out of the folder', () => {
    expect(videoPublicId('../other', 'lst/../1')).toBe('vrent/listings/..other/lst..1/tour');
  });

  it('is stable, so a replacement overwrites rather than accumulating', () => {
    expect(videoPublicId('a', 'b')).toBe(videoPublicId('a', 'b'));
  });
});

describe('the signature', () => {
  /* Cloudinary's own worked example, with its awkward value carrying commas
     and a pipe: the parameters sorted, joined, the secret appended, SHA-1. If
     this drifts, every upload is refused. */
  it('matches Cloudinary’s documented example', () => {
    expect(signParams({
      eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
      public_id: 'sample_image',
      timestamp: 1315060510,
    }, 'abcd')).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('does not depend on the order the parameters were written in', () => {
    const a = signParams({ timestamp: 1, public_id: 'x', overwrite: 'true' }, 's');
    const b = signParams({ overwrite: 'true', public_id: 'x', timestamp: 1 }, 's');
    expect(a).toBe(b);
  });

  it('changes when the destination changes', () => {
    expect(signParams({ public_id: 'mine', timestamp: 1 }, 's'))
      .not.toBe(signParams({ public_id: 'yours', timestamp: 1 }, 's'));
  });
});

describe('the addresses a listing serves', () => {
  it('asks for a playable copy and a frame from inside the video', () => {
    const { url, posterUrl } = videoUrls('vrent/listings/a/b/tour', { cloudName: 'demo', apiKey: 'k', apiSecret: 's' });
    expect(url).toBe('https://res.cloudinary.com/demo/video/upload/q_auto/vrent/listings/a/b/tour.mp4');
    expect(posterUrl).toContain('so_2');
    expect(posterUrl.endsWith('.jpg')).toBe(true);
  });
});

describe('how it reads on screen', () => {
  it('shows a length in minutes and seconds', () => {
    expect(videoLength(125)).toBe('2:05');
    expect(videoLength(48)).toBe('0:48');
  });

  it('says nothing when the length was never reported', () => {
    expect(videoLength(undefined)).toBe('');
    expect(videoLength(0)).toBe('');
  });

  it('states the size the way the floor plan does', () => {
    expect(videoSize(12.4 * 1024 * 1024)).toBe('12.4 MB');
    expect(videoSize(2048)).toBe('2 KB');
  });
});
