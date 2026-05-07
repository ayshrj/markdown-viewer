import { ImageResponse } from "next/og";
import { SocialImageTemplate } from "@/app/social-image-template";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} social preview`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<SocialImageTemplate />, size);
}
