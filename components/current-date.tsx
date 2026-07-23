export function CurrentDate() {
  const label=new Intl.DateTimeFormat("en-US", { weekday:"long", month:"long", day:"numeric" }).format(new Date());
  return <time dateTime={new Date().toISOString().slice(0,10)}>{label}</time>;
}
