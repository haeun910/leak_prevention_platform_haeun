"""ORG ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_org_entity


if __name__ == "__main__":
    run_single(
        entity_type="ORG",
        label="ENTITY",
        generator=gen_org_entity,
        filename="org_entity_5000.csv",
    )
