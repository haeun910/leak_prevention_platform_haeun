"""PERSON ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_person_entity


if __name__ == "__main__":
    run_single(
        entity_type="PERSON",
        label="ENTITY",
        generator=gen_person_entity,
        filename="person_entity_5000.csv",
    )
