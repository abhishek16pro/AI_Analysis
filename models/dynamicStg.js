import mongoose from "mongoose";

const data_schema = mongoose.Schema({
    name: { type: String, unique: true, required: true },
    type: { type: String, required: true },
    index: { type: String, required: true },

}, { strict: false });

mongoose.pluralize(null);
const DynamicStg = mongoose.model("dynamicStrategy", data_schema);

export default DynamicStg;