"""PASSWORD ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_password_entity


if __name__ == "__main__":
    run_single(
        entity_type="PASSWORD",
        label="ENTITY",
        generator=gen_password_entity,
        filename="password_entity_5000.csv",
    )
