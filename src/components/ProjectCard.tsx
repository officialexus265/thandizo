"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency, calculateProgress } from "@/lib/utils";

interface ProjectCardProps {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  targetAmount: number | string;
  raisedAmount: number | string;
  currency: string;
  donorCount: number;
  thumbnailUrl: string | null;
  status: string;
}

export default function ProjectCard({
  title,
  slug,
  shortDesc,
  targetAmount,
  raisedAmount,
  currency,
  donorCount,
  thumbnailUrl,
  status,
}: ProjectCardProps) {
  const progress = calculateProgress(raisedAmount, targetAmount);
  const isClosed = status === "CLOSED" || status === "FUNDED";

  return (
    <article className="project-card flex flex-col overflow-hidden h-full">
      {/* Thumbnail → Gallery */}
      <Link href={`/gallery/${slug}`} className="relative block aspect-[16/10] bg-stone-200">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400">
            No image
          </div>
        )}
        {status === "FUNDED" && (
          <span className="absolute top-2 right-2 bg-green-700 text-white text-xs font-medium px-2 py-1 rounded">
            Funded
          </span>
        )}
        {status === "CLOSED" && (
          <span className="absolute top-2 right-2 bg-stone-600 text-white text-xs font-medium px-2 py-1 rounded">
            Closed
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        {/* Title → Project page */}
        <Link href={`/project/${slug}`}>
          <h2 className="text-lg font-semibold text-stone-900 hover:text-red-700 transition line-clamp-2">
            {title}
          </h2>
        </Link>

        <p className="mt-1 text-sm text-stone-600 line-clamp-2 flex-1">{shortDesc}</p>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>{formatCurrency(raisedAmount, currency)} raised</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-stone-500 mt-1">
            <span>Target: {formatCurrency(targetAmount, currency)}</span>
            <span>{donorCount} donor{donorCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/project/${slug}`}
            className="text-sm text-stone-700 underline hover:text-red-700"
          >
            Read more
          </Link>
          <Link
            href={`/gallery/${slug}`}
            className="text-sm text-stone-700 underline hover:text-red-700"
          >
            View Gallery
          </Link>
          {!isClosed && (
            <Link
              href={`/project/${slug}#fund`}
              className="ml-auto inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg bg-red-700 text-white hover:bg-red-800 transition"
            >
              Fund Project
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
