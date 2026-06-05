import mongoose, { Schema, Document, Model } from "mongoose";
//import pokemonData from "../test-data/pokemons.js";

export interface IPokemon extends Document {
    id: number;
    num: string;
    name: string;
}

interface PokemonModel extends Model<IPokemon> {
    fetchByIds(ids: number[]): Promise<{ pokemons: IPokemon[]; missing: number[] }>;
}

const PokemonSchema = new Schema<IPokemon, PokemonModel>({
    id: { type: Number },
    name: { type: String },
});

// Static method
PokemonSchema.static("fetchByIds",
    async function (ids: number[]): Promise<{ pokemons: IPokemon[], missing: any[] }> {
        
        const pokemons = await this.find({ id: { $in: ids } }).lean();
        
        //const pokemons = pokemonData.pokemon as unknown as IPokemon[]; // BYPASS DB and use local JSON dump
        const missing: any = []; // returns IDs of pokemons which are missing in database
        
        // make sure we've got all ids retrieved from DB, and if not then populate missing with values we weren't able to fetch
        ids.forEach(id => {
            if (!pokemons.find((p: IPokemon) => p.id === id)) {
                missing.push(id);
            }
        });
        
        return { pokemons, missing };
    }
);

const Pokemon = mongoose.model<IPokemon, PokemonModel>("pokemons", PokemonSchema);
export default Pokemon;
