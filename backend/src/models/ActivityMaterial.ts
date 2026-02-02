import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo,
    DataType,
    Default,
} from "sequelize-typescript";
import Activity from "./Activity";

@Table({ tableName: "ActivityMaterials" })
class ActivityMaterial extends Model<ActivityMaterial> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Activity)
    @Column
    activityId: number;

    @BelongsTo(() => Activity)
    activity: Activity;

    @Column(DataType.STRING(255))
    materialName: string;

    @Default(1)
    @Column(DataType.DECIMAL(10, 2))
    quantity: number;

    @Column(DataType.STRING(50))
    unit: string;

    @Column(DataType.TEXT)
    notes: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default ActivityMaterial;
