const Task = require("../models/Task")
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery")
const { notifyUser } = require("../utils/notificationHelper")

exports.createTask = async(req,res)=>{
    try{
        const {title,description,assignedTo,dueDate,priority}=req.body;
        const task = await Task.create({
            tenantId:req.tenantId,
            title,
            description,
            assignedTo,
            dueDate,
            priority,
            createdBy:req.user.id
        });
        if (assignedTo && assignedTo !== req.user.id) {
            await notifyUser(req.tenantId, assignedTo, "task", "New task assigned", `You were assigned "${title}"`, "/tasks", { taskId: task._id });
        }
        res.status(201).json({message:"task created",task})
    }catch(error){
        res.status(500).json({error:error.message})
    }
};


exports.getTask = async (req,res)=>{
    try{
        const task = await Task.find(withTenant({}, req))
        .populate({ path: "assignedTo", select: "name email", options: POPULATE_SKIP_TENANT })
        .populate({ path: "createdBy", select: "name email", options: POPULATE_SKIP_TENANT });
        res.json(task);
    }catch(error){
        res.status(500).json({error:error.message})
    }
}

exports.getMyTasks = async(req,res)=>{
    try{
       const task = await Task.find(withTenant({assignedTo:req.user.id}, req));
       res.json(task);
    }catch(error){
        res.status(500).json({error:error.message})
    }
}

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const task = await Task.findOne(withTenant({ _id: req.params.id }, req));

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Admin can update any task
    // Assigned user can update status
    if (
      task.assignedTo.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not allowed to update status" });
    }

    task.status = status;
    await task.save();

    res.json({ message: "Task status updated successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.updateTask = async (req, res) => {

  try {
    const { title, description, assignedTo, dueDate, priority, status } = req.body;

    const task = await Task.findOne(withTenant({ _id: req.params.id }, req));

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only Admin OR Creator can update task
    if (
      task.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not allowed to update task" });
    }

    task.title = title || task.title;
    task.description = description || task.description;
    task.assignedTo = assignedTo || task.assignedTo;
    task.dueDate = dueDate || task.dueDate;
    task.priority = priority || task.priority;
    task.status = status || task.status;

    await task.save();

    res.json({
      message: "Task updated successfully",
      task,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTask = async(req,res)=>{
    try{
        const task = await Task.findOneAndDelete(withTenant({ _id: req.params.id }, req))
        res.status(200).json({message:"task deleted successfully"})
    }catch(error){
        res.status(500).json({error:error.message});
    }
};
