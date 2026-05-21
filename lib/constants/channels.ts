import {
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  Facebook,
  type LucideIcon,
} from "lucide-react";

export enum ChannelTypeEnum {
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  YOUTUBE = "youtube",
  BLUESKY = "bluesky",
  INSTAGRAM = "instagram",
  THREADS = "threads",
  FACEBOOK = "facebook",
}

export const getChannelIcon = (
  channelType: ChannelTypeEnum
): LucideIcon | null => {
  const iconMap: Record<ChannelTypeEnum, LucideIcon | null> = {
    [ChannelTypeEnum.TWITTER]: Twitter,
    [ChannelTypeEnum.LINKEDIN]: Linkedin,
    [ChannelTypeEnum.YOUTUBE]: Youtube,
    [ChannelTypeEnum.INSTAGRAM]: Instagram,
    [ChannelTypeEnum.FACEBOOK]: Facebook,
    [ChannelTypeEnum.BLUESKY]: Twitter, // Use Twitter icon as placeholder
    [ChannelTypeEnum.THREADS]: Twitter, // Use Twitter icon as placeholder
  };

  return iconMap[channelType] || null;
};
