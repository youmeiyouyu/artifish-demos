export async function onRequest({ request, env }) {
  return new Response(JSON.stringify({
    message: 'Functions are working!',
    path: new URL(request.url).pathname
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
