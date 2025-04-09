from fastapi import FastAPI
from backend.src.api.endpoints import router

app = FastAPI(title="AI Writing Tool API")

app.include_router(router)

@app.get("/")
def home():
    return {"message": "Welcome to the AI Writing Assistant!"}
