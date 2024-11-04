import type { Client, Message } from "discord.js";

export default function messageCreate(_client: Client, message: Message) {
  if (message.author.bot) return;
  message.reply("Zany!");
}
