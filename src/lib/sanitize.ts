export function cleanText(value: string, max = 4000) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function untrusted(label: string, value: string) {
  return `<untrusted_source name="${label}">\n${value.replaceAll("</untrusted_source>", "")}\n</untrusted_source>`;
}
