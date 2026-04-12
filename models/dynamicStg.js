import mongoose from "mongoose";

const data_schema = mongoose.Schema({
    active: { type: Boolean, default: false },
    name: { type: String, unique: true, required: true },
    strategyType: { type: String, required: true },
    index: { type: String, required: true },

}, { strict: false });

mongoose.pluralize(null);
const DynamicStg = mongoose.model("dynamicStrategy", data_schema);

export default DynamicStg;