class AppError(Exception):
    def __init__(self, error: str, detail: str, status_code: int = 400) -> None:
        self.error = error
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)
