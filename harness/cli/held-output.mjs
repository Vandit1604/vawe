/** Returns emit(fn): runs fn at once, or, while the promise `after` is pending, queues it and runs the queue in order when `after` settles. */
export function heldEmitter(after) {
  const queue = [];
  let held = Boolean(after);
  after?.finally(() => {
    held = false;
    for (const fn of queue.splice(0)) fn();
  });
  return (fn) => (held ? queue.push(fn) : fn());
}
