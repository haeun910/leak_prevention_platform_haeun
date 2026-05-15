"""ORG NON_ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_org_non


if __name__ == "__main__":
    run_single(
        entity_type="ORG",
        label="NON_ENTITY",
        generator=gen_org_non,
        filename="org_non_entity_5000.csv",
    )
