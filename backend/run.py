from pathlib import Path
import os

import uvicorn
from dotenv import load_dotenv


def main() -> None:
    env_file = Path(__file__).with_name(".env")
    if env_file.exists():
        load_dotenv(env_file)
    uvicorn.run(
        "backend.app:app",
        host="127.0.0.1",
        port=int(os.getenv("SWPM_API_PORT", "8000")),
        reload=False,
    )


if __name__ == "__main__":
    main()
