"use client";
import { useRouter } from "next/navigation";

export default function CtaLink({ text, link, className = "" }) {
    const router = useRouter();

    const handleClick = () => {
        if (link) {
            router.push(link);
        }
    };

    return (
      <button
        onClick={handleClick}
        className='m-2 px-6 py-3 bg-white/80 hover:bg-white border border-gray-500 text-black/80 hover:text-black font-semibold rounded-full cursor-pointer transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${className}'
      >
        {text}
      </button>
    );
}
