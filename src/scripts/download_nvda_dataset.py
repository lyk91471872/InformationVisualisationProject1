import kaggle
from pathlib import Path

data_dir = Path("src/data")
data_dir.mkdir(parents=True, exist_ok=True)

kaggle.api.dataset_download_files(
    "kylegraupe/nvda-daily-option-chains-q1-2020-to-q4-2022",
    path=data_dir,
    unzip=True
)
print("NVDA options dataset downloaded and unzipped into src/data/")
