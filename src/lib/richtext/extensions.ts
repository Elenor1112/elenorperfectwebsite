import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

// ONE extension list shared by the admin editor and the server renderer.
// If these ever drift, generateHTML throws on unknown nodes/marks — change
// them together.
export const richTextExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer' },
    },
  }),
  Image.configure({ HTMLAttributes: { loading: 'lazy', decoding: 'async' } }),
];
