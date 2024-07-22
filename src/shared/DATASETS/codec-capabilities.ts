import MediaSoup from "mediasoup";
export const CodecCapabilities: MediaSoup.types.RtpCodecCapability[] = [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000
    }
  ];