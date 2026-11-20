import { Navigate } from "react-router-dom";

// me: undefined/null -> still loading, false -> failed to load, object -> loaded user
export default function AdminRoute({ children, me }) {
    if (me === null || me === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }
    if (me === false) return <Navigate to="/login" replace />;
    if (me.role !== "admin") return <Navigate to="/student" replace />;
    return children;
}
