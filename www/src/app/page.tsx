import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function Home() {
  return (
    <div className="h-dvh flex flex-col items-center justify-center text-center gap-10 max-w-5xl mx-auto">
      <h1 className="z-10 text-3xl font-black leading-tight sm:text-7xl sm:leading-tight">
        The best{"  "}
        <Link
          href="https://deno.com/"
          target="_blank"
          rel="noreferrer"
          className="relative rounded bg-primary px-3 py-1 text-white hover:underline underline-offset-8"
        >
          Deno
        </Link>{" "}
        framework for Discord.js.
      </h1>
      <p>
        Dext is a powerful Discord.js framework that autogenerates responses for
        {" "}
        <em>static</em>{" "}
        commands and components, optimizing bot performance. It automatically
        handles slash command creation, event responses, and is easy to use and
        integrate.
      </p>
      <div className="flex gap-4 *:font-semibold *:text-lg">
        <Button size="lg" asChild>
          <Link href="/docs">Docs</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="https://discord.js.org" target="_blank" rel="noreferrer">
            Discord.js <ExternalLink className="!size-5" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link
            href="https://github.com/inbestigator/dext"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ExternalLink className="!size-5" />
          </Link>
        </Button>
      </div>

      <div className="p-2 rounded-lg font-semibold text-lg border">
        deno add jsr:@inbestigator/dext
      </div>
    </div>
  );
}
