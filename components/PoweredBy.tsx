import Image from "next/image";

export default function PoweredBy() {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
      <span>powered by</span>
      <Image
        src="/cold-lava-logo.png"
        alt="Cold Lava"
        width={100}
        height={30}
        className="object-contain invert"
      />
    </div>
  );
}
