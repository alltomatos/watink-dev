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

export type InputType = "checkbox" | "text" | "photo" | "number";

@Table({ tableName: "ActivityItems" })
class ActivityItem extends Model<ActivityItem> {
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
    label: string;

    @Default("checkbox")
    @Column(DataType.ENUM("checkbox", "text", "photo", "number"))
    inputType: InputType;

    @Column(DataType.TEXT)
    value: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    isDone: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    isRequired: boolean;

    @Default(0)
    @Column(DataType.INTEGER)
    order: number;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default ActivityItem;
