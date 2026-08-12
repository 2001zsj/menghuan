import { FixtureAnimeRepository } from "../src/index.js";
import { defineAnimeRepositoryContract } from "./repository-contract.js";

defineAnimeRepositoryContract("fixture", () => new FixtureAnimeRepository());
