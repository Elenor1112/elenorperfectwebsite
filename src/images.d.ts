// Next's built-in image types only declare lowercase extensions (e.g. .png).
// Some assets use an uppercase .PNG extension, so declare that variant too.
declare module '*.PNG' {
  import { StaticImageData } from 'next/image';
  const content: StaticImageData;
  export default content;
}

declare module '*.JPG' {
  import { StaticImageData } from 'next/image';
  const content: StaticImageData;
  export default content;
}
