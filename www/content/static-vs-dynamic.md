# Static vs Dynamic

This page is intended to shed some more light on how the static vs dynamic
determination works.

## Async

Asynchronous handlers are automatically marked as dynamic.

## Dynamic props

Handlers that try to access fields on the `interaction` prop other than the
functions listed below are automatically ruled out.

```ts
interaction.reply();
interaction.deferReply();
interaction.deleteReply();
interaction.editReply();
interaction.followUp();
interaction.showModal();
```
