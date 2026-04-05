from core.main import app
import os


if __name__ == '__main__':
    port = int(os.getenv("PORT", 8080))
    print(f"Agent service running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
