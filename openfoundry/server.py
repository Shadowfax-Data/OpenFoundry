from fastapi import FastAPI

# from fastapi.staticfiles import StaticFiles

app = FastAPI()


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve frontend static files at root
# app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")
