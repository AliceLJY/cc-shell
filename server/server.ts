const server = Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok" })
    }
    return new Response("Not found", { status: 404 })
  },
})

console.log(`CC Shell backend running on http://localhost:${server.port}`)
