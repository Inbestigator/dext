export default function loader(text: string) {
  let dotsIndex = 0;
  const dots = [".  ", ".. ", "...", "   "];
  const animationInterval = setInterval(async () => {
    const dot = dots[dotsIndex % dots.length];
    await Deno.stdout.write(
      new TextEncoder().encode(`\r   ${text}  \x1b[36m${dot}\x1b[0m`),
    );
    dotsIndex++;
  }, 300);

  return {
    stop: () => clearInterval(animationInterval),
    resolve: async () => {
      clearInterval(animationInterval);
      await Deno.stdout.write(
        new TextEncoder().encode(`\r \x1b[32m✓\x1b[0m ${text}     \n`),
      );
    },
    error: async () => {
      clearInterval(animationInterval);
      await Deno.stdout.write(
        new TextEncoder().encode(`\r \x1b[31m✕\x1b[0m ${text}     \n`),
      );
    },
  };
}
