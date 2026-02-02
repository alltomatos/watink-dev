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
import ActivityTemplate from "./ActivityTemplate";

export type InputType = "checkbox" | "text" | "photo" | "number";

@Table({ tableName: "ActivityTemplateItems" })
class ActivityTemplateItem extends Model<ActivityTemplateItem> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => ActivityTemplate)
    @Column
    templateId: number;

    @BelongsTo(() => ActivityTemplate)
    template: ActivityTemplate;

    @Column(DataType.STRING(255))
    label: string;

    @Default("checkbox")
    @Column(DataType.ENUM("checkbox", "text", "photo", "number"))
    inputType: InputType;

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

export default ActivityTemplateItem;
